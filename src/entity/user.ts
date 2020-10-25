import Database from '../utils/database';
import Result from '../models/result';
import { hash, compare } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Entity, PrimaryGeneratedColumn, Index, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('users')
export default class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Index({ unique: true })
    @Column({ type: 'uuid', unique: true, nullable: false })
    ukey: string;

    @Index({ unique: true })
    @Column({ unique: true, nullable: false, length: 50 })
    email: string;

    @Column({ nullable: false, length: 100 })
    password: string;

    @Column({ nullable: false, default: false })
    confirmed: boolean;

    @Column({ name: 'refresh_index', nullable: false, default: 0 })
    refreshIndex: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt?: Date;

    constructor(email: string, password: string, refreshIndex: number) {
        this.id = 0;
        this.ukey = '';
        this.email = email;
        this.password = password;
        this.confirmed = false;
        this.refreshIndex = refreshIndex;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    static async register(email: string, password: string, confirmation: string): Promise<Result<User>> {
        if (password != confirmation)
            return new Result<User>(new Error('Las contraseñas no coinciden'), 400);

        const u = await User.getByEmail(email);
        if (u != undefined)
            return new Result<User>(new Error('El usuario ya existe'), 400);
        
        try {
            const hpass = await hash(password, 12);
            const user = new User(email, hpass, 0);
            user.ukey = uuidv4();
            if (await user.save())
                return new Result<User>(user, 201);
            return new Result<User>(new Error('El registro falló'), 500);
        } catch (err) {
            console.log(err);
            return new Result<User>(new Error('El registro falló'), 500);
        }
    }

    static async login(email: string, password: string): Promise<Result<any>> {
        const user = await User.getByEmail(email);
        if (user == undefined)
            return new Result<any>(new Error('Credenciales incorrectas'), 400);

        if (!user.confirmed)
            return new Result<any>(new Error('Usuario no confirmado'), 401);

        try {
            const valid = await compare(password, user.password);
            return valid ? new Result<any>(user, 200) : new Result(new Error('Credenciales incorrectas'), 400);
        } catch (err) {
            console.log(err);
            return new Result<any>(new Error('El ingreso falló'), 500);
        }
        
    }

    static async getByUserKey(ukey: string, refreshIndex: number): Promise<User | undefined> {
        const db = new Database<User>(User);
        const user = await db.get({ ukey });
        return user == undefined || refreshIndex != user.refreshIndex ? undefined : user;
    }

    static async getByEmail(email: string): Promise<User | undefined> {
        const db = new Database<User>(User);
        return await db.get({ email });
    }

    async save(): Promise<boolean> {
        const db = new Database<User>(User);
        return await db.save(this);
    }

    async updateConfirmed(): Promise<Result<boolean>> {
        if (this.confirmed)
            return new Result<boolean>(new Error('El usuario ya está confirmado'), 401);
        const values = { confirmed: true };
        const filter = `id = ${this.id}`;
        const db = new Database<User>(User);
        const success = await db.update('users', values, filter);
        return success ? new Result<boolean>(true, 200) : new Result<boolean>(new Error('La confirmación falló'), 500);
    }

    async updatePassword(oldPassword: undefined | string, newPassword: string): Promise<Result<boolean>> {
        if (oldPassword != undefined && oldPassword == newPassword)
            return new Result<boolean>(new Error('La contraseña no cambió'), 400);
        const hpass = await hash(newPassword, 12);
        const values = { password: hpass };
        const filter = `id = ${this.id}`;
        const db = new Database<User>(User);
        const success = await db.update('users', values, filter);
        return success ? new Result<boolean>(true, 200) : new Result<boolean>(new Error('El cambio de contraseña falló'), 500);
    }

    async updateRefreshIndex(): Promise<Result<boolean>> {
        const values = { refreshIndex: () => 'refresh_index + 1' };
        const filter = `id = ${this.id}`;
        const db = new Database<User>(User);
        const success = await db.update('users', values, filter);
        return success ? new Result<boolean>(true, 200) : new Result<boolean>(new Error('El incremento del índice de actualización falló'), 500);
    }
}